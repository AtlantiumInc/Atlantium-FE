import { useReducer, useCallback, useEffect, useMemo } from "react";
import type { OnboardingFormData } from "../lib/onboarding-schema";
import { nameSchema } from "../lib/onboarding-schema";
import { isAnswered, stepsFor, type Branch, type StepDef } from "../lib/onboarding-steps";
import { detectUserTimezone } from "../lib/onboarding-options";

/**
 * Drives the questionnaire off the step registry.
 *
 * The old version walked a fixed range of fourteen numbers and asked
 * `shouldShowStep` whether to skip each one, which meant the flow's real shape
 * — what a founder answers versus an investor — was spread across a switch, a
 * schema map and a predicate. Position is now an index into the steps that
 * apply to this member, so changing a branch changes the list and nothing else.
 */
// Bumped when the step model changed; a restored index from the old numeric
// flow would land someone on an unrelated question.
const STORAGE_KEY = "atlantium_onboarding_progress_v2";

interface OnboardingState {
  stepIndex: number;
  formData: Partial<OnboardingFormData>;
  errors: Record<string, string>;
  isSubmitting: boolean;
  isComplete: boolean;
}

type OnboardingAction =
  | { type: "SET_STEP"; index: number }
  | { type: "UPDATE_FIELD"; field: keyof OnboardingFormData; value: unknown }
  | { type: "UPDATE_FIELDS"; fields: Partial<OnboardingFormData> }
  | { type: "SET_ERRORS"; errors: Record<string, string> }
  | { type: "CLEAR_ERRORS" }
  | { type: "SET_SUBMITTING"; isSubmitting: boolean }
  | { type: "SET_COMPLETE" }
  | { type: "RESTORE_STATE"; state: Partial<OnboardingState> }
  | { type: "RESET" };

function getInitialState(): OnboardingState {
  return {
    stepIndex: 0,
    formData: {
      first_name: "",
      last_name: "",
      avatar_url: "",
      timezone: detectUserTimezone(),
      interests: [],
      branch: undefined,
      headline: "",
      seeking: undefined,
      seeking_visibility: undefined,
      membership_tier: undefined,
      needs: [],
      focus_stages: [],
      domains: [],
      engagement: [],
    },
    errors: {},
    isSubmitting: false,
    isComplete: false,
  };
}

function onboardingReducer(state: OnboardingState, action: OnboardingAction): OnboardingState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, stepIndex: action.index, errors: {} };
    case "UPDATE_FIELD":
      return { ...state, formData: { ...state.formData, [action.field]: action.value }, errors: {} };
    case "UPDATE_FIELDS":
      return { ...state, formData: { ...state.formData, ...action.fields }, errors: {} };
    case "SET_ERRORS":
      return { ...state, errors: action.errors };
    case "CLEAR_ERRORS":
      return { ...state, errors: {} };
    case "SET_SUBMITTING":
      return { ...state, isSubmitting: action.isSubmitting };
    case "SET_COMPLETE":
      return { ...state, isComplete: true };
    case "RESTORE_STATE":
      return {
        ...state,
        stepIndex: action.state.stepIndex ?? state.stepIndex,
        formData: { ...state.formData, ...action.state.formData },
      };
    case "RESET":
      return getInitialState();
    default:
      return state;
  }
}

interface UseOnboardingFormOptions {
  initialData?: Partial<OnboardingFormData>;
  onComplete?: (data: OnboardingFormData) => Promise<void>;
}

export function useOnboardingForm(options: UseOnboardingFormOptions = {}) {
  // The draft is restored during initialization, not in an effect. As an effect
  // it raced the persist effect below — that one is declared first, so on every
  // mount it overwrote the saved draft with a blank one before the restore
  // could read it, and a refresh quietly lost every answer.
  const [state, dispatch] = useReducer(onboardingReducer, undefined, () => {
    const initial = getInitialState();
    if (options.initialData) initial.formData = { ...initial.formData, ...options.initialData };

    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.formData) {
          initial.formData = {
            ...initial.formData,
            ...parsed.formData,
            // Auth-provided fields always win over anything stored.
            ...(options.initialData?.first_name && { first_name: options.initialData.first_name }),
            ...(options.initialData?.last_name && { last_name: options.initialData.last_name }),
            ...(options.initialData?.avatar_url && { avatar_url: options.initialData.avatar_url }),
          };
          if (typeof parsed.stepIndex === "number") initial.stepIndex = parsed.stepIndex;
        }
      }
    } catch {
      // A corrupt draft is not worth failing the flow over.
    }

    return initial;
  });

  const steps = useMemo(
    () => stepsFor(state.formData.branch as Branch | undefined),
    [state.formData.branch],
  );
  // Changing a branch shortens the list; clamp so a back-then-switch can't
  // land past the end.
  const stepIndex = Math.min(state.stepIndex, steps.length - 1);
  const step: StepDef | undefined = steps[stepIndex];

  useEffect(() => {
    if (!state.isComplete) {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ stepIndex: state.stepIndex, formData: state.formData }),
      );
    }
  }, [state.stepIndex, state.formData, state.isComplete]);

  const updateField = useCallback(
    <K extends keyof OnboardingFormData>(field: K, value: OnboardingFormData[K]) => {
      dispatch({ type: "UPDATE_FIELD", field, value });
    },
    [],
  );

  const updateFields = useCallback((fields: Partial<OnboardingFormData>) => {
    dispatch({ type: "UPDATE_FIELDS", fields });
  }, []);

  const goToStep = useCallback((index: number) => {
    dispatch({ type: "SET_STEP", index });
  }, []);

  const validateCurrentStep = useCallback((): boolean => {
    if (!step) return true;

    // Identity is the one screen with real field-level rules; everything else
    // is "did they answer it", which the registry already describes.
    if (step.kind === "identity") {
      const result = nameSchema.safeParse(state.formData);
      if (!result.success) {
        const errorMap: Record<string, string> = {};
        result.error.issues.forEach((issue) => { errorMap[issue.path.join(".")] = issue.message; });
        dispatch({ type: "SET_ERRORS", errors: errorMap });
        return false;
      }
      dispatch({ type: "CLEAR_ERRORS" });
      return true;
    }

    const value = step.field
      ? (state.formData as Record<string, unknown>)[step.field]
      : undefined;
    if (!isAnswered(step, value)) {
      dispatch({ type: "SET_ERRORS", errors: { [step.field ?? step.id]: "Pick one to keep going." } });
      return false;
    }
    dispatch({ type: "CLEAR_ERRORS" });
    return true;
  }, [step, state.formData]);

  const nextStep = useCallback(() => {
    if (!validateCurrentStep()) return false;
    dispatch({ type: "SET_STEP", index: Math.min(stepIndex + 1, steps.length - 1) });
    return true;
  }, [validateCurrentStep, stepIndex, steps.length]);

  const prevStep = useCallback(() => {
    dispatch({ type: "SET_STEP", index: Math.max(stepIndex - 1, 0) });
  }, [stepIndex]);

  const submit = useCallback(async () => {
    if (!validateCurrentStep()) return false;
    dispatch({ type: "SET_SUBMITTING", isSubmitting: true });
    try {
      await options.onComplete?.(state.formData as OnboardingFormData);
      dispatch({ type: "SET_COMPLETE" });
      sessionStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (error) {
      dispatch({ type: "SET_SUBMITTING", isSubmitting: false });
      throw error;
    }
  }, [state.formData, validateCurrentStep, options]);

  const reset = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    dispatch({ type: "RESET" });
  }, []);

  return {
    step,
    steps,
    stepIndex,
    formData: state.formData,
    errors: state.errors,
    isSubmitting: state.isSubmitting,
    isComplete: state.isComplete,

    isFirstStep: stepIndex === 0,
    isLastStep: stepIndex === steps.length - 1,
    canGoBack: stepIndex > 0,
    // 1-based for display. Before a branch is picked this counts the spine
    // plus pricing, so the number moves down when they choose, never up.
    visibleStepNumber: stepIndex + 1,
    totalVisibleSteps: steps.length,

    updateField,
    updateFields,
    goToStep,
    nextStep,
    prevStep,
    submit,
    reset,
    validateCurrentStep,
  };
}

export type UseOnboardingFormReturn = ReturnType<typeof useOnboardingForm>;
