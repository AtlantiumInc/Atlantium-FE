import { useReducer, useCallback, useEffect } from "react";
import type { OnboardingFormData } from "../lib/onboarding-schema";
import {
  validateStep,
  shouldShowStep,
  getNextStep,
  getPrevStep,
} from "../lib/onboarding-schema";
import { detectUserTimezone } from "../lib/onboarding-options";

const STORAGE_KEY = "atlantium_onboarding_progress";
const TOTAL_STEPS = 12;

interface OnboardingState {
  currentStep: number;
  formData: Partial<OnboardingFormData>;
  errors: Record<string, string>;
  isSubmitting: boolean;
  isComplete: boolean;
}

type OnboardingAction =
  | { type: "SET_STEP"; step: number }
  | { type: "UPDATE_FIELD"; field: keyof OnboardingFormData; value: unknown }
  | { type: "UPDATE_FIELDS"; fields: Partial<OnboardingFormData> }
  | { type: "SET_ERRORS"; errors: Record<string, string> }
  | { type: "CLEAR_ERRORS" }
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "SET_SUBMITTING"; isSubmitting: boolean }
  | { type: "SET_COMPLETE" }
  | { type: "RESTORE_STATE"; state: Partial<OnboardingState> }
  | { type: "RESET" };

function getInitialState(): OnboardingState {
  return {
    currentStep: 1,
    formData: {
      first_name: "",
      last_name: "",
      avatar_url: "",
      timezone: detectUserTimezone(),
      is_georgia_resident: false,
      primary_goal: undefined,
      interests: [],
      membership_tier: "club",
      working_on_project: undefined,
      project_description: "",
      technical_level: undefined,
      community_hopes: [],
      time_commitment: undefined,
      success_definition: "",
    },
    errors: {},
    isSubmitting: false,
    isComplete: false,
  };
}

function onboardingReducer(
  state: OnboardingState,
  action: OnboardingAction
): OnboardingState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, currentStep: action.step, errors: {} };

    case "UPDATE_FIELD":
      return {
        ...state,
        formData: { ...state.formData, [action.field]: action.value },
        errors: {},
      };

    case "UPDATE_FIELDS":
      return {
        ...state,
        formData: { ...state.formData, ...action.fields },
        errors: {},
      };

    case "SET_ERRORS":
      return { ...state, errors: action.errors };

    case "CLEAR_ERRORS":
      return { ...state, errors: {} };

    case "NEXT_STEP": {
      const nextStep = getNextStep(
        state.currentStep,
        state.formData,
        TOTAL_STEPS
      );
      return { ...state, currentStep: nextStep, errors: {} };
    }

    case "PREV_STEP": {
      const prevStep = getPrevStep(state.currentStep, state.formData);
      return { ...state, currentStep: prevStep, errors: {} };
    }

    case "SET_SUBMITTING":
      return { ...state, isSubmitting: action.isSubmitting };

    case "SET_COMPLETE":
      return { ...state, isComplete: true };

    case "RESTORE_STATE":
      return {
        ...state,
        currentStep: action.state.currentStep ?? state.currentStep,
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
  const [state, dispatch] = useReducer(onboardingReducer, undefined, () => {
    const initial = getInitialState();
    // Merge initial data if provided (e.g., from Google auth)
    if (options.initialData) {
      initial.formData = { ...initial.formData, ...options.initialData };
    }
    return initial;
  });

  // Persist state to sessionStorage
  useEffect(() => {
    if (!state.isComplete) {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          currentStep: state.currentStep,
          formData: state.formData,
        })
      );
    }
  }, [state.currentStep, state.formData, state.isComplete]);

  // Restore state from sessionStorage on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Only restore if we have saved data and options.initialData doesn't override
        if (parsed.formData) {
          dispatch({
            type: "RESTORE_STATE",
            state: {
              currentStep: parsed.currentStep,
              formData: {
                ...parsed.formData,
                // Always use initialData for fields that come from auth
                ...(options.initialData?.first_name && {
                  first_name: options.initialData.first_name,
                }),
                ...(options.initialData?.last_name && {
                  last_name: options.initialData.last_name,
                }),
                ...(options.initialData?.avatar_url && {
                  avatar_url: options.initialData.avatar_url,
                }),
              },
            },
          });
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  const updateField = useCallback(
    <K extends keyof OnboardingFormData>(
      field: K,
      value: OnboardingFormData[K]
    ) => {
      dispatch({ type: "UPDATE_FIELD", field, value });
    },
    []
  );

  const updateFields = useCallback((fields: Partial<OnboardingFormData>) => {
    dispatch({ type: "UPDATE_FIELDS", fields });
  }, []);

  const goToStep = useCallback((step: number) => {
    dispatch({ type: "SET_STEP", step });
  }, []);

  const validateCurrentStep = useCallback((): boolean => {
    const result = validateStep(state.currentStep, state.formData);
    if (!result.success && result.errors) {
      const errorMap: Record<string, string> = {};
      result.errors.issues.forEach((issue) => {
        const path = issue.path.join(".");
        errorMap[path] = issue.message;
      });
      dispatch({ type: "SET_ERRORS", errors: errorMap });
      return false;
    }
    dispatch({ type: "CLEAR_ERRORS" });
    return true;
  }, [state.currentStep, state.formData]);

  const nextStep = useCallback(() => {
    if (validateCurrentStep()) {
      dispatch({ type: "NEXT_STEP" });
      return true;
    }
    return false;
  }, [validateCurrentStep]);

  const prevStep = useCallback(() => {
    dispatch({ type: "PREV_STEP" });
  }, []);

  const submit = useCallback(async () => {
    // Validate all required fields before submit
    const fullValidation = validateStep(state.currentStep, state.formData);
    if (!fullValidation.success && fullValidation.errors) {
      const errorMap: Record<string, string> = {};
      fullValidation.errors.issues.forEach((issue) => {
        const path = issue.path.join(".");
        errorMap[path] = issue.message;
      });
      dispatch({ type: "SET_ERRORS", errors: errorMap });
      return false;
    }

    dispatch({ type: "SET_SUBMITTING", isSubmitting: true });

    try {
      if (options.onComplete) {
        await options.onComplete(state.formData as OnboardingFormData);
      }
      dispatch({ type: "SET_COMPLETE" });
      // Clear storage on successful completion
      sessionStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (error) {
      dispatch({ type: "SET_SUBMITTING", isSubmitting: false });
      throw error;
    }
  }, [state.formData, state.currentStep, options]);

  const reset = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    dispatch({ type: "RESET" });
  }, []);

  // Calculate visible step number (accounting for skipped steps)
  const getVisibleStepNumber = useCallback((): number => {
    let visibleStep = 0;
    for (let i = 1; i <= state.currentStep; i++) {
      if (shouldShowStep(i, state.formData)) {
        visibleStep++;
      }
    }
    return visibleStep;
  }, [state.currentStep, state.formData]);

  const getTotalVisibleSteps = useCallback((): number => {
    let total = 0;
    for (let i = 1; i <= TOTAL_STEPS; i++) {
      if (shouldShowStep(i, state.formData)) {
        total++;
      }
    }
    return total;
  }, [state.formData]);

  const isFirstStep = state.currentStep === 1;
  const isLastStep = state.currentStep === TOTAL_STEPS;
  const canGoBack = !isFirstStep;
  const shouldShowCurrentStep = shouldShowStep(
    state.currentStep,
    state.formData
  );

  return {
    // State
    currentStep: state.currentStep,
    formData: state.formData,
    errors: state.errors,
    isSubmitting: state.isSubmitting,
    isComplete: state.isComplete,

    // Computed
    isFirstStep,
    isLastStep,
    canGoBack,
    shouldShowCurrentStep,
    visibleStepNumber: getVisibleStepNumber(),
    totalVisibleSteps: getTotalVisibleSteps(),

    // Actions
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
